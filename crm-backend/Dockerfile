FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run seed on first start, then launch the server
CMD ["sh", "-c", "python seed_data.py && uvicorn main:app --host 0.0.0.0 --port 8000"]
