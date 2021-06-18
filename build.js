const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const marked = require('marked');

(async () => {
  function listDirs(path) {
    return fs.readdirSync(path, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort()
      .reverse();
  }

  function listFiles(path, ext) {
    return fs.readdirSync(path, { withFileTypes: true })
      .filter(entry => entry.isFile())
      .map(entry => entry.name)
      .filter(name => name.endsWith(ext))
      .sort()
      .reverse();
  }

  const baseDir = `${__dirname}/src`;

  const years = listDirs(`${baseDir}`)
    .map(year => {
      const months = listDirs(`${baseDir}/${year}`)
        .map(month => {
          const files = listFiles(`${baseDir}/${year}/${month}`, '.md')
            .map(name => {
              const date = name.replace(/\.md$/, '');
              const md = fs.readFileSync(`${baseDir}/${year}/${month}/${name}`).toString();
              const html = marked(md, { gfm: true });
              return { name, date: +date, md, html };
            });
          return { month: +month, files };
        })
        .filter(month => month.files.length > 0);

      return { year: +year, months };
    })
    .filter(year => year.months.length > 0);

  async function renderEjs(input, output, data) {
    console.log(`render ${input} -> ${output}`);

    await fs.promises.mkdir(path.dirname(output), { recursive: true });
    const html = await promisify(ejs.renderFile)(input, data);
    await fs.promises.writeFile(output, html);
  }

  const distDir = `${__dirname}/dist`;

  await renderEjs(`${__dirname}/templates/index.html.ejs`, `${distDir}/index.html`, { years });

  for (const { year, months } of years) {
    for (const { month, files } of months) {
      await renderEjs(`${__dirname}/templates/diary.html.ejs`, `${distDir}/${year}/${month}/index.html`, { year, month, files });
    }
  }
})();
