const ssURL = "/*ここには自分で作成したスプレッドシートのURLを入力してください*/";


function doGet(e) {
  let page = e.parameter.page;
  if (!page) {
    page = 'consoleMenu';
  }
  console.log(page)
  var template = HtmlService.createTemplateFromFile(page);
  if (page == "index") {
    let newFolder = createNewFolder();
    template.articleIdentifier = newFolder.id;
    template.articleDirectoryURL = newFolder.url;
  }
  if (page == "editArticles") {
    let id = e.parameter.id;
    console.log("id", id)
    let ss = SpreadsheetApp.openByUrl(ssURL).getSheetByName(id);
    let keys = ss.getRange(2, 6, ss.getLastRow(), 1).getValues();
    let values = ss.getRange(2, ss.getLastColumn(), ss.getLastRow(), 1).getValues();
    let dict = {}
    console.log("keys", keys);
    console.log("values", values);

    for (let i = 0; i < keys.length; i++) {
      dict[keys[i]] = values[i];
    }
    template.articleIdentifier = id;
    template.articleDirectoryURL = values[1];
    console.log(JSON.stringify(dict))
    template.data = JSON.stringify(dict);
  }
  return template.evaluate();
}

function doPost(e) {
  let timeStamp = new Date();
  let ss = SpreadsheetApp.openByUrl(ssURL).getSheetByName("HTMLoutput");
  let articleIDs = ss.getRange(2, 2, ss.getLastRow(), 1).getValues();
  articleIDs = articleIDs.filter(value => value[0] != "").flat();

  let keys = getKeys();
  let header = [];
  let inputData = [];

  /*連想型配列を使ってfor文を回す場合
  let allInput = e.parameter;
  これだと処理は早くなるけど、HTML側でinputタグが追加されたときに勝手にヘッダーが変わるから問題ありそう
  一回別のシートに保存して、マスタシートで参照する必要あり
  for (let key in allInput) {
    let data = allInput[key];
    header.push(key);
    inputData.push(data);
  }
  */

  for (let i = keys.length - 1; i >= 0; i--) {
    try {
      //console.log(keys[i])
      let data = e.parameter[keys[i]];
      //console.log(data);
      header.push(keys[i])
      inputData.push([data]);
    }
    catch {
      console.log(keys[i], "は存在しません")
      continue
    }
  }
  header = header.reverse();
  inputData = inputData.reverse();
  inputData.splice(0, 0, [timeStamp]);
  console.log("header.length:::", header.length);
  console.log("inputData.length:::", inputData.length);
  //ss.getRange(1, 1, 1, header.length).setValues([header])
  //ss.getRange(ss.getLastRow(), 2, 1, inputData.length).setValues([inputData]);
  console.log("inputData::", inputData);
  //データ入力
  let sheetForInput = inputSheet(e.parameter.articleIdentifier);
  sheetForInput.getRange(2, sheetForInput.getLastColumn() + 1, inputData.length, 1).setValues(inputData);
  
  //フォルダの作成はindexにgetでアクセスされた時に変更した
  /*最新記事の場合新規フォルダを作成
  console.log("articleIDs:::", articleIDs);
  let newArticle = Math.max(...articleIDs);
  console.log("Number(inputData[1]", newArticle);
  let newFolder = createNewFolder(newArticle);
  sheetForInput.getRange(3, sheetForInput.getLastColumn() + 1).setValue(newFolder.url);
  */

  const htmlTemplate = HtmlService.createTemplateFromFile('consoleMenu');
  //htmlTemplate.articleIdentifier = Number(e.parameter.articleIdentifier) + 1;
  //htmlTemplate.articleDirectoryURL = newFolder.url;

  return htmlTemplate.evaluate();

}

function insertHTML() {
  let html = HtmlService.createHtmlOutputFromFile('leftSideBar').getContent();
  return html
}

function getAppUrl() {
  return ScriptApp.getService().getUrl();
}

function getParts() {
  let ss = SpreadsheetApp.openByUrl(ssURL).getSheetByName("部位グループ").getRange("A:H");
  let allParts = ss.getValues();
  allParts = allParts.filter(value => value[0] != ""); //空白削除
  let bigParts = allParts.filter(value => value[3] == 1);
  let middleParts = allParts.filter(value => value[3] == 2);
  let smallParts = allParts.filter(value => value[3] == 3);
  let dict = { "bigParts": bigParts, "middleParts": middleParts, "smallParts": smallParts };
  console.log("dict:::",dict);
  return JSON.stringify(dict);
}

function getArticles() {
  let ss = SpreadsheetApp.openByUrl(ssURL).getSheetByName("記事一覧");
  let data = ss.getDataRange().getDisplayValues();
  data = data.filter(value => value[1] != "");
  return JSON.stringify(data);
}

function getKeys() {
  let keys = SpreadsheetApp.openByUrl(ssURL).getSheetByName("HTMLoutput").getRange("1:1").getValues()[0];
  keys = keys.filter(value => value != "");
  console.log(keys);
  return keys
}

function getArticleId() {
  console.log(ssURL)
  let sheet = SpreadsheetApp.openByUrl(ssURL).getSheetByName("HTMLoutput");
  console.log(sheet.getName());
  let lastArticle = sheet.getRange(sheet.getLastRow() - 1, 2).getValue();
  console.log(Number(lastArticle));
  return Number(lastArticle) + 1
}

function getArticleFolderURL() {
  let sheet = SpreadsheetApp.openByUrl(ssURL).getSheetByName("HTMLoutput");
  let url = sheet.getRange(sheet.getLastRow(), 1).getValue();
  console.log(url)
  return url
}

function createNewFolder() {
  let max = 0;
  let sheets = SpreadsheetApp.openByUrl(ssURL).getSheets();
  for (let sheet of sheets) {
    let sheetNum = Number(sheet.getName())
    if (sheetNum > max) {
      max = sheetNum;
    }
  }
  max += 1;
  //2フォルダを入れておく管理用のフォルダ
  let drive = DriveApp.getFolderById("/*ここには自分で作成したドライブフォルダのidを入力してください*/");
  //以下ファイル保存用フォルダ作成
  let newFolder = drive.createFolder(max.toString());
  console.log(max, newFolder.getUrl());
  return { "id": max, "url": newFolder.getUrl() };
}


// HTMLのuploadボタン押下時に実行
function gasUpload(formObject) {
  let folderID = formObject["articleDirectory"].split("/")[5];

  console.log(folderID);
  let keys = Object.keys(formObject);
  for (let key of keys) {
    console.log(key);
    try {
      if (formObject[key]) {
        console.log("画像:", key, "/", formObject[key].getName());
        if (formObject[key].getName() != "") {
          let file = formObject[key];
          let name = file.getName();
          let type = file.getContentType();
          let time = new Date().toLocaleString();
          let fileUrl = uploadFileToGoogleDrive(file, folderID);
        }
      }
    }
    catch (e) {
      console.log("エラー：：", e, "///", key)
    }
  }
}

// ファイルをGoogleDriveにアップロード
function uploadFileToGoogleDrive(file, folderID) {
  const uploadFolder = DriveApp.getFolderById(folderID);
  const uploadFile = uploadFolder.createFile(file);
  return uploadFile.getUrl();
}

// データをSpreadsheetに追加
function saveDataToSpreadsheet(values) {
  const sheet = SpreadsheetApp.openById(spreadSheetID).getSheetByName(spreadSheetName);
  sheet.appendRow(values);
}


function inputSheet(articleIdentifier) {
  let ss = SpreadsheetApp.openByUrl(ssURL)
  let sheet = ss.getSheetByName(articleIdentifier);
  if (sheet) {
    return sheet
  }
  else {
    console.log("ss.getSheets().length", ss.getSheets().length);
    console.log("articleIdentifier", articleIdentifier);
    let newSS = ss.insertSheet(ss.getSheets().length).setName(articleIdentifier);
    let template = ss.getSheetByName("template").getDataRange().getValues();
    let templateBackGroundColor = ss.getSheetByName("template").getDataRange().getBackgrounds();
    newSS.getRange(1, 1, template.length, template[0].length).setValues(template);
    newSS.getRange(1, 1, template.length, template[0].length).setBackgrounds(templateBackGroundColor);
    return newSS
  }
}








