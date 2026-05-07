"""Atualiza roles especificos:
- contato@bruamaral.tec.br: adm_geral -> adm_tecnico
- erika@abacherly.com.br: adm_tecnico -> adm_geral

Hierarquia confirmada pelo dono do sistema:
  adm_tecnico  : TUDO (incluindo treinamento e configuracoes)
  adm_geral    : tudo MENOS treinamento e configuracoes
  analista     : operacoes basicas
  cliente      : seus proprios dados
"""
import firebase_admin
from firebase_admin import auth, firestore as admin_fs

CORRECOES = {
    "contato@bruamaral.tec.br": "adm_tecnico",
    "erika@abacherly.com.br": "adm_geral",
    # Erika gmail é backup da Erika abacherly — mesmo nivel
    "erikaabacherlybkp@gmail.com": "adm_geral",
}

firebase_admin.initialize_app(options={"projectId": "abacherly-licitacoes"})
db = admin_fs.client()

# Mapa email -> UID (para update por ID, mais robusto)
auth_by_email = {}
for u in auth.list_users().iterate_all():
    if u.email:
        auth_by_email[u.email.lower()] = u.uid

for email, role_alvo in CORRECOES.items():
    uid = auth_by_email.get(email.lower())
    if not uid:
        print(f"  [SKIP] {email}: sem UID Firebase Auth")
        continue
    ref = db.collection("users").document(uid)
    snap = ref.get()
    if not snap.exists:
        print(f"  [SKIP] {email}: doc /users/{uid} nao existe")
        continue
    data = snap.to_dict() or {}
    role_atual = data.get("role")
    if role_atual == role_alvo:
        print(f"  [OK] {email}: ja eh {role_alvo}")
        continue
    ref.update({"role": role_alvo})
    print(f"  [ATUALIZADO] {email}: {role_atual} -> {role_alvo}")
