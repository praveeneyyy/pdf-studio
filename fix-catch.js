const fs = require("fs");
const path = require("path");
const services = ["pdf-service", "conversion-service", "ocr-service", "ai-service", "office-service", "monolithic-backend"];
services.forEach(svc => {
    const file = path.join(__dirname, svc, "index.js");
    if (fs.existsSync(file)) {
        let code = fs.readFileSync(file, "utf8");
        code = code.replace(/catch \((e|err)\) \{/g, (match, p1) => {
            return match + "\n        if (typeof req !== \"undefined\" && typeof cleanup === \"function\") {\n            if (req.file) cleanup([req.file]);\n            if (req.files) cleanup(req.files);\n        }";
        });
        fs.writeFileSync(file, code);
        console.log("Fixed", svc);
    }
});
