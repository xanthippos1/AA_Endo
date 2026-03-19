# test_vision.py — drop this in C:\Users\xanar\Documents\AA_Endo\

from google.cloud import vision

client = vision.ImageAnnotatorClient(
    client_options={"api_endpoint": "eu-vision.googleapis.com"}
)

with open("original_jpg\Patient004_1.jpg", "rb") as f:
    image = vision.Image(content=f.read())

context = vision.ImageContext(language_hints=["el", "el-t-i0-handwrit"])
response = client.document_text_detection(image=image, image_context=context)

print(response.full_text_annotation.text)