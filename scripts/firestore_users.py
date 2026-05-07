"""Lista todos os usuarios em /users com role, email e clientId."""
from google.cloud import firestore

db = firestore.Client(project="abacherly-licitacoes")

for d in db.collection("users").stream():
    data = d.to_dict() or {}
    print(f"  ID: {d.id}")
    print(f"    nome:     {data.get('name', '-')}")
    print(f"    email:    {data.get('email', '-')}")
    print(f"    role:     {data.get('role', '-')}")
    print(f"    clientId: {data.get('clientId', '-')}")
    print(f"    criado:   {data.get('createdAt', '-')}")
    print()
