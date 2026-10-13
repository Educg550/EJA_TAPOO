from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="React + FastAPI App",
    description="A simple demo API built with Python and FastAPI",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specify your React domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define a data model
class Item(BaseModel):
    name: str
    price: float
    description: str | None = None

@app.get("/")
def read_root():
    return {"message": "Welcome to FastAPI backend!"}

@app.post("/items/")
def create_item(item: Item):
    return {"data": item}
