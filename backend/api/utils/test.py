from google import genai
import dotenv

dotenv.load_dotenv()

# Configuration
client = genai.Client(api_key=dotenv.get_key(".env", "GEMINI_API_KEY"))

# Model Initialization
def generate_content():
    try:
        response = client.models.generate_content(
            model="gemini-flash-latest",
            contents="Explain why I should use the new google-genai library in 2 sentences."
        )
        print(response.text)
    except Exception as e:
        print(f"Deployment Error: {e}")

if __name__ == "__main__":
    print("Listing available models...")
    for model in client.models.list():
        print(f"Name: {model.name} | Supported Actions: {model.supported_actions}")
    generate_content()