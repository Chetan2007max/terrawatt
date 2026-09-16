"""
schemas.py
Pydantic request/response models for the TerraWatt FastAPI service.
"""

from pydantic import BaseModel


class IngestPayload(BaseModel):
    node_id: str
    date: str
    actual_value: float
