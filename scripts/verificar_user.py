"""Verifica especificamente o doc /users/{uid} para um email."""
import sys
import firebase_admin
from firebase_admin import auth, firestore as admin_fs

EMAIL = sys.argv[1] if len(sys.argv) > 1 else "contato@bruamaral.tec.br"

firebase_admin.initialize_app(options={"projectId": "abacherly-licitacoes"})
db = admin_fs.client()

# Pega UID do Firebase Auth
try:
    user = auth.get_user_by_email(EMAIL)
    print(f"Firebase Auth UID: {user.uid}")
    print(f"Email verified:    {user.email_verified}")
    print(f"Disabled:          {user.disabled}")
    print()
except Exception as e:
    print(f"Erro Auth: {e}")
    sys.exit(1)

# Busca doc /users/{uid}
ref = db.collection("users").document(user.uid)
snap = ref.get()
if snap.exists:
    print(f"Doc /users/{user.uid}:")
    data = snap.to_dict() or {}
    for k, v in data.items():
        print(f"  {k}: {v}")
else:
    print(f"Doc /users/{user.uid} NAO EXISTE")

# Busca todos docs com o mesmo email (deveria ser apenas 1)
print()
print("Busca por email no Firestore:")
results = list(db.collection("users").where("email", "==", EMAIL).get())
print(f"  {len(results)} doc(s) encontrado(s)")
for r in results:
    print(f"    id={r.id}  role={r.to_dict().get('role')}")
