import os

from waitress import serve

from app import create_app

app = create_app()

if __name__ == "__main__":
    serve(
        app,
        host=os.getenv("NOVA_HOST", "127.0.0.1"),
        port=int(os.getenv("NOVA_PORT", "9182")),
        threads=8,
    )