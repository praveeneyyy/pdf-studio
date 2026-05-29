Set-Location -Path d:\Projects\pdf_tools\api-gateway; npm init -y; npm install express cors http-proxy-middleware multer form-data
Set-Location -Path d:\Projects\pdf_tools\pdf-service; npm init -y; npm install express multer cors pdf-lib
Set-Location -Path d:\Projects\pdf_tools\conversion-service; npm init -y; npm install express multer cors pdf-lib pdfjs-dist canvas
Set-Location -Path d:\Projects\pdf_tools\ocr-service; npm init -y; npm install express multer cors tesseract.js
Set-Location -Path d:\Projects\pdf_tools\ai-service; npm init -y; npm install express multer cors pdf-parse @google/genai
