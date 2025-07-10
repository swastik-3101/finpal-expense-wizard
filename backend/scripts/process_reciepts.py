import sys
import json
import easyocr
import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser


os.environ["GOOGLE_API_KEY"] = "APIKEY"

def run_ocr(image_path):
    reader = easyocr.Reader(['en'], gpu=False, verbose=False)
    results = reader.readtext(image_path)
    return results

def build_aggregate_prompt():
    return PromptTemplate.from_template("""
You are an intelligent assistant that reads raw OCR text of a receipt.

From the OCR text below:

{ocr_text}

Extract the following information and return a single JSON object in this exact format:

{{
  "title": "string",     // merchant name or receipt title
  "amount": number,      // total amount from the receipt
  "category": "string"   // main spending category for the entire receipt, choose from Food, Transport, Housing, Utilities, Entertainment, Shopping, Health, Other
}}

Only return raw JSON, no explanations or code blocks.
""")

def main(image_path):
    results = run_ocr(image_path)
    raw_text = "\n".join([text for _, text, _ in results])

    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash")

    aggregate_prompt = build_aggregate_prompt()
    chain = aggregate_prompt | llm | StrOutputParser()

    try:
        output = chain.invoke({"ocr_text": raw_text})

        # Clean up if wrapped in backticks or code block tags
        if output.startswith("```"):
            output = output.strip("`").strip("json").strip()

        parsed = json.loads(output)
        print(json.dumps(parsed))

    except Exception as e:
        print(json.dumps({"error": "Failed to process receipt", "details": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Image path argument missing"}))
        sys.exit(1)
    main(sys.argv[1])
