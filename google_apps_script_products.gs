const PRODUCT_SPREADSHEET_ID = "1VV11XQZyzsRVpUXa7nipGWvIwHClDz_PDGhuD6ZeHCc";
const PRODUCT_SHEET_NAME = "Item ForSell";
const PRODUCT_ORDER_SHEET_NAME = "ProductOrders";
const PRODUCT_IMAGE_FOLDER_ID = "1Nj1e3sbJqGg-kNqYWeIhYMNbsUTev6X1";

function doGet(e) {
  e = e || { parameter: {} };
  const action = (e.parameter.action || "").trim();

  try {
    if (action === "getProducts") {
      return jsonResponse(getProducts());
    }

    if (action === "getProductOrdersByEmail") {
      return jsonResponse(getProductOrdersByEmail(e.parameter.email, e.parameter.uid));
    }

    return jsonResponse({ success: false, message: "Unknown action" });
  } catch (error) {
    return jsonResponse({ success: false, message: error.message });
  }
}

function doPost(e) {
  e = e || { postData: { contents: "{}" } };
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    const action = (body.action || "").trim();

    if (action === "createProduct") {
      return jsonResponse(createProduct(body));
    }

    if (action === "updateProduct") {
      return jsonResponse(updateProduct(body));
    }

    return jsonResponse({ success: false, message: "Unknown action" });
  } catch (error) {
    return jsonResponse({ success: false, message: error.message });
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getProductSheet() {
  const ss = SpreadsheetApp.openById(PRODUCT_SPREADSHEET_ID);
  let sheet = ss.getSheetByName(PRODUCT_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(PRODUCT_SHEET_NAME);
  }

  ensureProductHeaders(sheet);
  return sheet;
}

function ensureProductHeaders(sheet) {
  const headers = [
    "productId",
    "name",
    "description",
    "price",
    "stock",
    "status",
    "imageUrl",
    "imageFileId",
    "imageName",
    "adminEmail",
    "createdAt",
    "updatedAt"
  ];

  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const hasHeader = firstRow.some(value => String(value || "").trim() !== "");

  if (!hasHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }
}

function getProducts() {
  const sheet = getProductSheet();
  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return { success: true, products: [] };
  }

  const headers = values[0].map(header => String(header || "").trim());
  const products = values.slice(1)
    .filter(row => row.some(cell => String(cell || "").trim() !== ""))
    .map(rowToObject(headers))
    .filter(product => String(product.status || "active") !== "hidden")
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

  return { success: true, products };
}

function createProduct(body) {
  const sheet = getProductSheet();
  const now = new Date();
  const productId = "PRD-" + Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
  let image = { imageUrl: "", imageFileId: "" };
  try {
    image = saveProductImage(body, productId);
  } catch (error) {
    Logger.log("Product image upload skipped: " + error.message);
  }

  sheet.appendRow([
    productId,
    body.name || "",
    body.description || "",
    Number(body.price || 0),
    Number(body.stock || 0),
    body.status || "active",
    image.imageUrl,
    image.imageFileId,
    body.imageName || "",
    body.adminEmail || "",
    now,
    now
  ]);

  return {
    success: true,
    productId,
    imageUrl: image.imageUrl
  };
}

function updateProduct(body) {
  const sheet = getProductSheet();
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(header => String(header || "").trim());
  const productIdIndex = headers.indexOf("productId");

  if (!body.productId || productIdIndex === -1) {
    return { success: false, message: "Missing productId" };
  }

  const rowIndex = values.findIndex((row, index) => index > 0 && row[productIdIndex] === body.productId);
  if (rowIndex === -1) {
    return { success: false, message: "Product not found" };
  }

  const current = rowToObject(headers)(values[rowIndex]);
  const image = body.imageBase64 ? saveProductImage(body, body.productId) : {
    imageUrl: current.imageUrl || "",
    imageFileId: current.imageFileId || ""
  };
  const now = new Date();

  const next = {
    productId: body.productId,
    name: body.name ?? current.name ?? "",
    description: body.description ?? current.description ?? "",
    price: Number(body.price ?? current.price ?? 0),
    stock: Number(body.stock ?? current.stock ?? 0),
    status: body.status ?? current.status ?? "active",
    imageUrl: image.imageUrl,
    imageFileId: image.imageFileId,
    imageName: body.imageName || current.imageName || "",
    adminEmail: body.adminEmail || current.adminEmail || "",
    createdAt: current.createdAt || now,
    updatedAt: now
  };

  const nextRow = headers.map(header => next[header] ?? "");
  sheet.getRange(rowIndex + 1, 1, 1, nextRow.length).setValues([nextRow]);

  return { success: true, productId: body.productId, imageUrl: image.imageUrl };
}

function saveProductImage(body, productId) {
  if (!body.imageBase64) {
    return { imageUrl: "", imageFileId: "" };
  }

  const folder = DriveApp.getFolderById(PRODUCT_IMAGE_FOLDER_ID);
  const bytes = Utilities.base64Decode(body.imageBase64);
  const extension = getExtensionFromMimeType(body.imageType || "image/jpeg");
  const safeName = sanitizeFileName(body.imageName || productId + extension);
  const fileName = productId + "-" + safeName;
  const blob = Utilities.newBlob(bytes, body.imageType || "image/jpeg", fileName);
  const file = folder.createFile(blob);
return {
    imageUrl: "https://drive.google.com/uc?export=view&id=" + file.getId(),
    imageFileId: file.getId()
  };
}

function getExtensionFromMimeType(mimeType) {
  const map = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif"
  };
  return map[mimeType] || ".jpg";
}

function sanitizeFileName(name) {
  return String(name)
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function rowToObject(headers) {
  return row => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = row[index];
    });
    return item;
  };
}

function getProductOrdersByEmail(email, uid) {
  const ss = SpreadsheetApp.openById(PRODUCT_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(PRODUCT_ORDER_SHEET_NAME);

  if (!sheet) {
    return { success: true, orders: [] };
  }

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return { success: true, orders: [] };
  }

  const headers = values[0].map(header => String(header || "").trim());
  const orders = values.slice(1)
    .filter(row => row.some(cell => String(cell || "").trim() !== ""))
    .map(rowToObject(headers))
    .filter(order => {
      const orderEmail = String(order.email || "").toLowerCase();
      const orderUid = String(order.uid || "");
      return (email && orderEmail === String(email).toLowerCase()) || (uid && orderUid === String(uid));
    });

  return { success: true, orders };
}
function testGetProducts() {
  Logger.log(JSON.stringify(getProducts()));
}
function testDriveAccess() {
  const folder = DriveApp.getFolderById(PRODUCT_IMAGE_FOLDER_ID);
  Logger.log(folder.getName());
}