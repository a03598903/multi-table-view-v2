const { chromium } = require('playwright');
const { exec } = require('child_process');

async function testAndOpen() {
  const ports = [3000, 3001, 3002, 3003, 3004, 3005];

  for (const port of ports) {
    const url = `http://localhost:${port}`;
    console.log(`Testing port ${port}...`);

    try {
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();

      const response = await page.goto(url, { timeout: 5000 });

      if (response && response.ok()) {
        const title = await page.title();
        const content = await page.content();

        // Check if this is our project (multi-table-view)
        const isOurProject = title.includes('多维表格') ||
                            title.includes('Table') ||
                            content.includes('multi-table') ||
                            content.includes('TableView') ||
                            content.includes('vite') && content.includes('vue');

        console.log(`Port ${port}: Title="${title}", IsOurProject=${isOurProject}`);

        if (!isOurProject) {
          console.log(`  -> Skipping, not our project`);
          await browser.close();
          continue;
        }

        await browser.close();

        // Open in system browser
        console.log(`Found our project! Opening ${url} in system browser...`);
        const cmd = process.platform === 'win32'
          ? `start ${url}`
          : process.platform === 'darwin'
            ? `open ${url}`
            : `xdg-open ${url}`;

        exec(cmd, (error) => {
          if (error) {
            console.error('Failed to open browser:', error);
          } else {
            console.log('Browser opened successfully!');
          }
          process.exit(0);
        });
        return;
      }

      await browser.close();
    } catch (error) {
      console.log(`Port ${port} failed: ${error.message}`);
    }
  }

  console.log('No available port found!');
  process.exit(1);
}

testAndOpen();
