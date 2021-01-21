const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const [url, formatType] = process.argv.slice(2);

if (!url) {
  throw 'Please provide a URL as the first argument.';
}
 
if (!formatType || (formatType !== '1' && formatType !== '2')) {
  throw 'Please provide a Format Type ("1" or "2") as the second argument.'
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

  let fileName = boardTitle.replace(/\s/g, '');
  let result = '';

  if (formatType === '1')
  {
    fileName += ".txt"
    result = parsedText;
  }

  if (formatType === '2')
  {
    fileName += ".csv"
    data.forEach(function(array) {
      let row = array.join(',');
      result += row + '\r\n';
    });
  }

  return {result, fileName, formatType};
}

function writeToFile(data, fileName, formatType) {
  const resolvedPath = path.resolve(fileName);

  //Txt format (Format 1)
  if (formatType === '1')
  {
    fs.writeFile(resolvedPath, data, (error) => {
      if (error) {
        console.error(error);
      } else {
        console.log(`Successfully written to file at: ${resolvedPath}`);
      }
      process.exit();
    });
  }
  //CSV format (Format 2)
  else if (formatType === '2')
  {
    fs.writeFile(resolvedPath, data, 'utf8', (error) => {
      if (error) {
        console.error(error);
      } else {
        console.log(`Successfully written to file at: ${resolvedPath}`);
      }
      process.exit();
    });
  }
}



function handleError(error) {
  console.error(error);
}

run().then((data) => writeToFile(data.result, data.fileName, data.formatType)).catch(handleError);
