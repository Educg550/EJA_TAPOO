FROM ghcr.io/astral-sh/uv:0.13.6-debian-slim
ENV UV_PYTHON_INSTALL_DIR=/opt/python UV_LINK_MODE=copy PYTHONUNBUFFERED=1
WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock backend/.python-version ./
RUN uv python install && uv sync --locked --no-dev
COPY backend /app/backend
ENV PYTHONPATH=/app
RUN useradd --create-home app && chown -R app:app /app /opt/python
USER app
EXPOSE 8000
CMD ["uv", "run", "--no-sync", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
