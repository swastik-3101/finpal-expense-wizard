from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from groq import Groq
import easyocr
import tempfile, os, json

app = FastAPI()

print("Loading EasyOCR model... (only happens once)")
reader = easyocr.Reader(['en'], gpu=False, verbose=False)
print("EasyOCR ready!")

client = Groq(api_key="yourapikeyhere")

PROMPT = """From this receipt OCR text, extract and return ONLY a raw JSON object with no explanation, no code fences, nothing else.

Format:
{{"title": "merchant name", "amount": 0.00, "category": "Food|Transport|Shopping|Utilities|Medical|Entertainment|Other"}}

OCR text:
{ocr_text}"""

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/parse-receipt")
async def parse_receipt(receipt: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        tmp.write(await receipt.read())
        tmp_path = tmp.name

    try:
        print(f"Running OCR on {receipt.filename}...")
        results = reader.readtext(tmp_path)
        raw_text = "\n".join(text for _, text, _ in results)

        if not raw_text.strip():
            return JSONResponse({"error": "No text detected in image"}, status_code=400)

        print("Calling Groq...")
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": PROMPT.format(ocr_text=raw_text)}],
            max_tokens=256,
            temperature=0,
        )

        text = response.choices[0].message.content.strip()

        if text.startswith("```"):
            text = text.replace("```json", "").replace("```", "").strip()

        parsed = json.loads(text)
        print(f"Parsed: {parsed}")
        return parsed

    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}, raw output: {text}")
        return JSONResponse({"error": "Failed to parse LLM output"}, status_code=500)
    except Exception as e:
        print(f"Unexpected error: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        os.unlink(tmp_path)