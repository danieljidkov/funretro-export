const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const [url] = process.argv.slice(2);

if (!url) {
  throw 'Please provide a URL as the first argument.';
}

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(url);
  await page.waitForSelector('.message-list');

  const boardTitle = await page.$eval('#board-name', (node) => node.innerText.trim());

  if (!boardTitle) {
    throw 'Board title does not exist. Please check if provided URL is correct.'
  }
  
  let data = [[]];

  let parsedText = boardTitle + '\n\n';

  const columns = await page.$$('.message-list');

  for (let i = 0; i < columns.length; i++) {
    
    const columnTitle = await columns[i].$eval('.column-header', (node) => node.innerText.trim());
    //Insert the column header
    data[0].splice(i, 0, columnTitle);

    const messages = await columns[i].$$('.message-main');

    for (let j = 0; j < messages.length; j++) {
      let row = j + 1;
      //Insert a new row if needed
      if (data.length <= row) {
        data.push([])
      }
      const messageText = await messages[j].$eval('.message-body .text', (node) => node.innerText.trim());
      const votes = await messages[j].$eval('.votes .vote-area span.show-vote-count', (node) => node.innerText.trim());
      parsedText += `- ${messageText} (${votes})` + '\n';

      if (votes > 0)
      {
        data[row][i] = messageText;
      }
    }

    if (messages.length) {
      parsedText += '\n';
    }
  }

  let csvData = '';
  data.forEach(function(array) {
    let row = array.join(',');
    csvData += row + '\r\n';
  });

  let fileName = boardTitle.replace(/\s/g, '');
  return {csvData, fileName};
}

function writeToFile(data, fileName) {
  const resolvedPath = path.resolve(fileName + '.csv');

  fs.writeFile(resolvedPath, data, 'utf8', (error) => {
    if (error) {
      console.error(error);
    } else {
      console.log(`Successfully written to file at: ${resolvedPath}`);
    }
    process.exit();
  });
}

function handleError(error) {
  console.error(error);
}

run().then((data) => writeToFile(data.csvData, data.fileName)).catch(handleError);
