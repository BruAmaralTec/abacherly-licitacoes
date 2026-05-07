"""Migra docs em /users para usar UID do Firebase Auth como ID + atualiza roles legados.

Para cada doc em /users:
  1. Pega email do doc
  2. Busca UID correspondente no Firebase Auth
  3. Cria novo doc em users/{uid} com mesmo conteudo + role normalizado:
     super_admin -> adm_geral, admin -> adm_tecnico, operator -> analista
  4. Deleta doc antigo (se ID antigo != UID)

Idempotente: se ja estiver com ID = UID, so atualiza role.
"""
import firebase_admin
from firebase_admin import auth, firestore as admin_fs

ROLE_MAP = {
    "super_admin": "adm_geral",
    "admin": "adm_tecnico",
    "operator": "analista",
}

firebase_admin.initialize_app(options={"projectId": "abacherly-licitacoes"})
db = admin_fs.client()

# Mapa email -> UID
auth_by_email = {}
for u in auth.list_users().iterate_all():
    if u.email:
        auth_by_email[u.email.lower()] = u.uid

migrados = 0
ja_ok = 0
nao_encontrado = 0
role_atualizado = 0

for d in db.collection("users").stream():
    data = d.to_dict() or {}
    email = (data.get("email") or "").lower()
    if not email:
        print(f"  [SKIP] {d.id} sem email")
        continue

    uid = auth_by_email.get(email)
    if not uid:
        print(f"  [NO_AUTH] {email} - nao existe no Firebase Auth")
        nao_encontrado += 1
        continue

    role_antigo = data.get("role", "")
    role_novo = ROLE_MAP.get(role_antigo, role_antigo)

    if d.id == uid:
        # Ja com ID correto - so atualiza role se precisar
        if role_novo != role_antigo:
            db.collection("users").document(uid).update({"role": role_novo})
            print(f"  [ROLE] {email}: {role_antigo} -> {role_novo}")
            role_atualizado += 1
        else:
            print(f"  [OK] {email} - ja correto")
            ja_ok += 1
        continue

    # Migra: cria novo doc com UID e remove antigo
    novo_data = dict(data)
    novo_data["role"] = role_novo
    db.collection("users").document(uid).set(novo_data)
    db.collection("users").document(d.id).delete()
    print(f"  [MIGRADO] {email}: {d.id} -> {uid}  (role: {role_antigo} -> {role_novo})")
    migrados += 1

print()
print(f"Resumo:")
print(f"  migrados:                {migrados}")
print(f"  ja corretos (s/ mudanca): {ja_ok}")
print(f"  apenas role atualizado:  {role_atualizado}")
print(f"  email sem Auth:          {nao_encontrado}")
