from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
from bs4 import BeautifulSoup
import re

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

class ScrapeRequest(BaseModel):
    url: str = None
    keyword: str = None

def scrape_startech(soup, url):
    # Startech logic
    name = soup.find("h1", class_="product-name")
    name = name.text.strip() if name else ""
    
    price_elem = soup.find("td", class_="product-price")
    price = "0"
    if price_elem:
        price = re.sub(r"[^\d]", "", price_elem.text)
    
    image = soup.find("img", class_="main-img")
    image_url = image["src"] if image else ""
    
    desc_elem = soup.find("div", class_="full-description")
    description = desc_elem.text.strip()[:500] if desc_elem else ""

    return {
        "name": name,
        "price": price,
        "image_url": image_url,
        "images": [image_url] if image_url else [],
        "description": description,
        "brand": "Other",
        "category": "CCTV",
        "source": "StarTech",
        "url": url
    }

def scrape_ryans(soup, url):
    # Ryans logic
    name = soup.find("h1", class_="title")
    name = name.text.strip() if name else ""
    
    price_elem = soup.find("span", class_="price")
    price = "0"
    if price_elem:
        price = re.sub(r"[^\d]", "", price_elem.text)
        
    image = soup.find("img", id="zoom_03")
    image_url = image["src"] if image else ""
    
    desc_elem = soup.find("div", class_="product-description")
    description = desc_elem.text.strip()[:500] if desc_elem else ""

    return {
        "name": name,
        "price": price,
        "image_url": image_url,
        "images": [image_url] if image_url else [],
        "description": description,
        "brand": "Other",
        "category": "CCTV",
        "source": "Ryans",
        "url": url
    }

@app.post("/api/scrape")
async def scrape_product(request: ScrapeRequest):
    if not request.url and not request.keyword:
        raise HTTPException(status_code=400, detail="Must provide url or keyword")
    
    if request.keyword:
        # Dummy keyword response or implement a search scraper
        return {"products": [{
            "name": f"Found for keyword: {request.keyword}",
            "price": "5000",
            "image_url": "https://via.placeholder.com/300",
            "images": ["https://via.placeholder.com/300"],
            "description": "AI searched product.",
            "category": "CCTV",
            "brand": "Dahua",
        }]}

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
    }
    
    try:
        res = requests.get(request.url, headers=headers, timeout=10)
        res.raise_for_status()
        soup = BeautifulSoup(res.text, "lxml")
        
        product_data = {}
        if "startech.com.bd" in request.url:
            product_data = scrape_startech(soup, request.url)
        elif "ryanscomputers.com" in request.url:
            product_data = scrape_ryans(soup, request.url)
        else:
            # Generic scraper
            title = soup.find("title")
            product_data = {
                "name": title.text.strip() if title else "Unknown",
                "price": "0",
                "image_url": "https://via.placeholder.com/300",
                "images": [],
                "description": "Generic scraped product"
            }
            
        return {"products": [product_data]}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
