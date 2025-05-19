import sys
import json
import easyocr
import cv2
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
import os

# Set Gemini API Key (replace with your actual key or load from environment)
os.environ["GOOGLE_API_KEY"] = "AIzaSyBGfMhJ7RhVPpCp3YvZZ_Pt7p6sg6pYQwo"

def run_ocr(image_path):
    reader = easyocr.Reader(['en'], gpu=False, verbose=False)
    results = reader.readtext(image_path)
    return results

def build_prompt():
    return PromptTemplate.from_template("""
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

Only return raw JSON. Do not add explanations or wrap in code blocks.
""")

def main(image_path):
    results = run_ocr(image_path)
    raw_text = "\n".join([text for _, text, _ in results])

    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash")
    prompt = build_prompt()
    chain = prompt | llm | StrOutputParser()

    try:
        structured_output = chain.invoke({"ocr_text": raw_text})

        # Remove triple backticks if any
        if structured_output.startswith("```"):
            structured_output = structured_output.strip("`").strip("json").strip()

        parsed_json = json.loads(structured_output)
        print(json.dumps(parsed_json))  # Clean JSON output for Node.js
    except Exception as e:
        print(json.dumps({"error": "Failed to process receipt", "details": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Image path argument missing"}))
        sys.exit(1)
    main(sys.argv[1])
