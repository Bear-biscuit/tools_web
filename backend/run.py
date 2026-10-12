from __future__ import annotations

import os

from app import create_app

app = create_app()


if __name__ == "__main__":
    app.run(
        host=os.getenv("NOVA_HOST", "127.0.0.1"),
        port=int(os.getenv("NOVA_PORT", "8000")),
        debug=os.getenv("NOVA_DEBUG", "true").lower() == "true",
    )