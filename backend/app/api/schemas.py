from pydantic import BaseModel, ConfigDict

# Response DTO for file information
class FileInfoResponse(BaseModel):
    name: str
    path: str

    model_config = ConfigDict(from_attributes=True)

     
