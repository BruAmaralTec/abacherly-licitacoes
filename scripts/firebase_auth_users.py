"""Lista usuarios no Firebase Auth e cruza com Firestore /users por email.
Identifica casos onde o doc id em /users != UID do Firebase Auth.
"""
import firebase_admin
from firebase_admin import auth, firestore as admin_fs

firebase_admin.initialize_app(options={"projectId": "abacherly-licitacoes"})
db = admin_fs.client()

# 1. Lista users do Firebase Auth
print("=== Firebase Auth ===")
auth_users = {}
for u in auth.list_users().iterate_all():
    print(f"  UID: {u.uid}")
    print(f"    email: {u.email}")
    print(f"    nome:  {u.display_name or '-'}")
    print()
    if u.email:
        auth_users[u.email.lower()] = u.uid

# 2. Cruza com Firestore
print("=== Cruzamento Firestore /users x Firebase Auth ===")
for d in db.collection("users").stream():
    data = d.to_dict() or {}
    email = (data.get("email") or "").lower()
    auth_uid = auth_users.get(email)
    status = "OK" if auth_uid == d.id else "MISMATCH"
    print(f"  [{status}] firestore_id={d.id}  email={email}")
    if auth_uid and auth_uid != d.id:
        print(f"           firebase_auth_uid={auth_uid}  (deveria ser este)")
    elif not auth_uid:
        print(f"           SEM USER NO FIREBASE AUTH com este email")
    print()
