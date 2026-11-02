# CityMETER Hotel — Developer Handoff

รุ่นเผยแพร่ 0.3.4 · 2 พ.ย. 2569 · ชีตวิจัยตรวจแหล่ง 1 พ.ย. 2569

เริ่มอ่าน `source/handoff/README.md` จากนั้น Product Statement (`source/PRODUCT_STATEMENT.md` + `source/handoff/product-statement.json`), Product Brief และ Implementation Plan ในโฟลเดอร์ `source/handoff` ทั้ง `.md` และ `.json` ใช้คู่กัน

เข้าโฟลเดอร์ `source` แล้วรัน `npm test` และ `npm start` เปิด http://127.0.0.1:4173/

ชุดนี้มี source code (ES modules มีคอมเมนต์สัญญาทุกโมดูล), datasets (ดัชนีเขต/อำเภอ + ขอบเขต 77 จังหวัด + ที่พัก ห้อง เครือ สถานี ศูนย์การค้า), assets ที่ตรวจ hash แล้ว, unit tests บนข้อมูลจริง, JSON Schema 1.5.0, acceptance criteria A1–A14, สคริปต์สร้างข้อมูล/ขอบเขต/ใบรับ/manifest/bundle ตรวจ LDS + Location Intelligence parity และตรวจ live bytes อ่าน `source/AGENTS.md` ก่อนแก้ไข

เว็บจริง: https://montri-th.github.io/hotel/
Repository: https://github.com/montri-th/hotel

`RELEASE_RECEIPT.json` (ถ้ามีในชุด) ผูกชุดส่งต่อกับ commit ผล GitHub Pages และ live attestation ส่วน `evidence/` เป็นหลักฐานหน้าจอและผลเทียบ hash ของไฟล์บนเว็บ แยกจาก source ที่ commit แล้ว
