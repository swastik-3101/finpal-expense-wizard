import sys
import json
import easyocr
import cv2
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
import os

# Load Gemini API key securely (set this in env or hardcode temporarily)
os.environ["GOOGLE_API_KEY"] = "YOUR_GEMINI_API_KEY"

def run_ocr(image_path):
    reader = easyocr.Reader(['en'], gpu=False)  # GPU True if available
    results = reader.readtext(image_path)
    return results

def build_prompt(ocr_text):
    return PromptTemplate.from_template(f"""
You are an intelligent assistant that extracts structured data from OCR text of a receipt.

OCR Text:
{ocr_text}

Please parse the text and return the data in the following JSON format:

{{
  "merchant_info": {{
    "name": "string",
    "address": ["string"],
    "phone": "string"
  }},
  "receipt_info": {{
    "date": "string",
    "time": "string",
    "server": "string",
    "table": "string"
  }},
  "items": [
    {{
      "name": "string",
      "price": float
    }}
  ],
  "totals": {{
    "subtotal": float,
    "tax": float,
    "service_charge": {{
      "percent": int,
      "amount": float
    }},
    "total": float
  }},
  "tip_suggestions": {{
    "15%": float,
    "18%": float,
    "20%": float
  }}
}}

Only return JSON. Do not add explanations.
""")

def main(image_path):
    results = run_ocr(image_path)
    raw_text = "\n".join([text for _, text, _ in results])

    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash")
    prompt = build_prompt(raw_text)

    chain = prompt | llm | StrOutputParser()
    structured_output = chain.invoke({"ocr_text": raw_text})

    print(structured_output)  # This is sent back to Node.js via stdout

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Image path argument missing"}))
        sys.exit(1)
    main(sys.argv[1])
