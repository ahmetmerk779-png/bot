import os, uuid, shutil, json
from datetime import timedelta
from flask import Flask, render_template, request, make_response, redirect
from groq import Groq
from duckduckgo_search import DDGS
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "gizli-anahtar-123")
app.config["UPLOAD_FOLDER"] = "uploads"
app.config["SESSION_FOLDER"] = "sessions"
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024

os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
os.makedirs(app.config["SESSION_FOLDER"], exist_ok=True)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

SYSTEM_PROMPT = (
    "Sen çok yönlü bir yapay zeka asistanısın. "
    "Kullanıcının isteğine göre cevap verirsin:\n"
    "- Sohbet, bilgi → net ve yardımsever.\n"
    "- Kod istenirse → çalışan kodu ```dil ... ``` bloğu içinde ver.\n"
    "- APK veya JAR istenirse → ilgili Java/Kotlin ve proje dosyalarını ver.\n"
    "Ayrıca her soruda internette arama yapılıp sonuçlar sana verilecek. Güncel bilgileri kullan."
)

def web_ara(sorgu, max_sonuc=3):
    try:
        with DDGS() as ddgs:
            sonuclar = list(ddgs.text(sorgu, max_results=max_sonuc))
            metin = ""
            for i, s in enumerate(sonuclar, 1):
                metin += f"{i}. {s['title']}\n{s['body']}\nKaynak: {s['href']}\n\n"
            return metin.strip()
    except:
        return ""

def get_user_token():
    token = request.cookies.get("user_token")
    if not token:
        token = str(uuid.uuid4())
    return token

def set_user_token(response, token):
    response.set_cookie("user_token", token, max_age=timedelta(days=30), httponly=True)

def get_session_file(token):
    return os.path.join(app.config["SESSION_FOLDER"], f"{token}.json")

def load_history(token):
    dosya = get_session_file(token)
    if os.path.exists(dosya):
        with open(dosya, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def save_history(token, history):
    dosya = get_session_file(token)
    with open(dosya, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)

def get_user_upload_folder(token):
    folder = os.path.join(app.config["UPLOAD_FOLDER"], token)
    os.makedirs(folder, exist_ok=True)
    return folder

@app.route("/")
def index():
    token = get_user_token()
    history = load_history(token)

    upload_folder = get_user_upload_folder(token)
    dosyalar = []
    if os.path.exists(upload_folder):
        for f in os.listdir(upload_folder):
            dosya_yolu = os.path.join(upload_folder, f)
            if os.path.isfile(dosya_yolu):
                dosyalar.append({"isim": f, "boyut": os.path.getsize(dosya_yolu)})

    resp = make_response(render_template("index.html", history=history, dosyalar=dosyalar))
    if not request.cookies.get("user_token"):
        set_user_token(resp, token)
    return resp

@app.route("/sor", methods=["POST"])
def sor():
    token = get_user_token()
    soru = request.form.get("soru", "")
    kod = ""
    if not soru.strip():
        return redirect("/")

    upload_folder = get_user_upload_folder(token)
    dosya_icerikleri = ""
    if os.path.exists(upload_folder):
        for f in os.listdir(upload_folder):
            dosya_yolu = os.path.join(upload_folder, f)
            if os.path.isfile(dosya_yolu):
                try:
                    with open(dosya_yolu, "r", encoding="utf-8") as df:
                        icerik = df.read()
                    dosya_icerikleri += f"\n--- {f} ---\n{icerik}\n"
                except:
                    pass

    arama_sonuc = web_ara(soru)
    ek_baglam = ""
    if arama_sonuc:
        ek_baglam = f"\n\nİNTERNET ARAMA SONUÇLARI:\n{arama_sonuc}\n\nBu sonuçlara dayanarak cevap ver."
    if dosya_icerikleri:
        ek_baglam += f"\n\nYÜKLENEN DOSYALAR:\n{dosya_icerikleri}\n\nBu dosyaları referans al."

    tam_prompt = SYSTEM_PROMPT + ek_baglam

    try:
        completion = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {"role": "system", "content": tam_prompt},
                {"role": "user", "content": soru}
            ],
            temperature=0.7,
            max_tokens=4096
        )
        cevap = completion.choices[0].message.content

        if "```html" in cevap:
            bas = cevap.find("```html") + 7
            son = cevap.find("```", bas)
            if son != -1:
                kod = cevap[bas:son].strip()
        elif "```" in cevap:
            bas = cevap.find("```") + 3
            son = cevap.find("```", bas)
            if son != -1:
                kod = cevap[bas:son].strip()

    except Exception as e:
        cevap = f"Hata: {str(e)}"

    history = load_history(token)
    history.append({"soru": soru, "cevap": cevap, "kod": kod})
    save_history(token, history)

    resp = make_response(redirect("/"))
    if not request.cookies.get("user_token"):
        set_user_token(resp, token)
    return resp

@app.route("/yeni_sohbet")
def yeni_sohbet():
    token = get_user_token()
    session_file = get_session_file(token)
    if os.path.exists(session_file):
        os.remove(session_file)
    upload_folder = get_user_upload_folder(token)
    if os.path.exists(upload_folder):
        shutil.rmtree(upload_folder)
    resp = make_response(redirect("/"))
    resp.delete_cookie("user_token")
    return resp

@app.route("/yukle", methods=["POST"])
def dosya_yukle():
    token = get_user_token()
    if "dosya" not in request.files:
        return redirect("/")
    dosya = request.files["dosya"]
    if dosya.filename == "":
        return redirect("/")
    filename = secure_filename(dosya.filename)
    upload_folder = get_user_upload_folder(token)
    dosya.save(os.path.join(upload_folder, filename))
    return redirect("/")

@app.route("/onizle", methods=["POST"])
def onizle():
    kod = request.form.get("kod", "")
    return render_template("onizle.html", kod=kod)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
