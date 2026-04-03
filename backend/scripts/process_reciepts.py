import sys
import json
import easyocr
import os
import traceback

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser


# ---------------- OCR FUNCTION ----------------
def run_ocr(image_path):
    reader = easyocr.Reader(['en'], gpu=False, verbose=False)
    results = reader.readtext(image_path)
    return results


# ---------------- PROMPT ----------------
def build_aggregate_prompt():
    return PromptTemplate.from_template("""
You are an intelligent assistant that reads raw OCR text of a receipt.

From the OCR text below:

{ocr_text}

Extract the following information and return a single JSON object in this exact format:

{{
  "title": "string",
  "amount": number,
  "category": "string"
}}

Rules:
- Title should be merchant/shop name
- Amount should be total paid amount
- Category should be one of: Food, Transport, Shopping, Utilities, Medical, Entertainment, Other
- If unsure, choose "Other"

Only return raw JSON.
No explanations.
No code blocks.
""")

# ---------------- MAIN ----------------
def main(image_path):
    try:
        # OCR
        print("Running OCR...", file=sys.stderr)
        results = run_ocr(image_path)

        raw_text = "\n".join([text for _, text, _ in results])

        if not raw_text.strip():
            raise Exception("No text detected from image")

        # LLM
        print("Invoking Gemini model...", file=sys.stderr)
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash-lite")

        prompt = build_aggregate_prompt()
        chain = prompt | llm | StrOutputParser()

        output = chain.invoke({"ocr_text": raw_text})

        # Cleanup (in case Gemini wraps output)
        output = output.strip()
        if output.startswith("```"):
            output = output.replace("```json", "").replace("```", "").strip()

        parsed = json.loads(output)

        # ✅ FINAL OUTPUT (stdout)
        print(json.dumps(parsed, indent=2))

    except Exception as e:
        error_response = {
            "error": "Failed to process receipt",
            "message": str(e),
            "traceback": traceback.format_exc()
        }

        # ❌ Error JSON (stdout)
        print(json.dumps(error_response, indent=2))


# ---------------- ENTRY POINT ----------------
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Image path argument missing"
        }))
        sys.exit(1)

    main(sys.argv[1])
