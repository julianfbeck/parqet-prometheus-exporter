const express = require("express");
const Prometheus = require("prom-client");
const cron = require("node-cron");
const puppeteer = require("puppeteer");

const app = express();
const port = process.env.PORT || 3001;
const metricsInterval = Prometheus.collectDefaultMetrics();
let is_fetching = false;

cron.schedule(" 0 */2 * * * *", async () => {
  if (is_fetching) {
    console.log("already Fetching");
    return;
  }
  console.log("start fetching");

  let end = fetchTime.startTimer();
  is_fetching = true;
  await fetchPortfolio();
  is_fetching = false;
  console.log("finished-fetching");
  console.log(end())
});

const loginCounter = new Prometheus.Counter({
  name: "login_counter",
  help: "Number of times the exporter has logged in to parquet",
  labelNames: ["parquet", "money"],
});

const portfolioCounter = new Prometheus.Gauge({
  name: "portfolio_value",
  help: "Total value of the portfolio",
  labelNames: ["parquet", "money"],
});

const investedCounter = new Prometheus.Gauge({
  name: "invested_value",
  help: "Total value invested",
  labelNames: ["parquet", "money"],
});

const portfolioWinCounter = new Prometheus.Gauge({
  name: "win_value",
  help: "Total win of the portfolio",
  labelNames: ["parquet", "money"],
});

const dividendCounter = new Prometheus.Gauge({
  name: "dividend_value",
  help: "received dividends",
  labelNames: ["parquet", "money"],
});

const fetchTime = new Prometheus.Histogram({
  name: "fetch_time",
  help: "total time to fetch ",
  labelNames: ["parquet", "money"],
  buckets: [5, 10, 15, 20, 25, 30],
});

app.get("/metrics", async (req, res) => {
  console.log("data");
  res.set("Content-Type", Prometheus.register.contentType);
  let data = await Prometheus.register.metrics();
  res.end(data);
});

const server = app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`);
});

const cleanup = (value) => {
  return Number(value.trim().replace(",", ".").replace(/[\$€]/g, ""));
};

const fetchPortfolio = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: "/usr/bin/chromium-browser",
  });
  const page = await browser.newPage();
  await page.goto("https://auth.parqet.com/u/login", {
    waitUntil: "networkidle2",
  });
  await page.waitForXPath('//*[@id="username"]');

  const username = await page.$x('//*[@id="username"]');
  await username[0].type(process.env.EMAIL);

  const password = await page.$x('//*[@id="password"]');
  await password[0].type(process.env.PASSWORD);
  const confirmButton = await page.$x(
    "/html/body/div/main/section/div/div/div/form/div[2]/button"
  );
  console.log("logged in");
  await Promise.all([await confirmButton[0].click()]);
  await page.waitForXPath(
    "/html/body/div/div/div/div[3]/main/div[2]/div/div/div[2]/div/div/div/div/div[2]/dl/div[1]/div/dd/span"
  );

  let portfolio = await page.$x(
    "/html/body/div/div/div/div[3]/main/div[2]/div/div/div[2]/div/div/div/div/div[2]/dl/div[1]/div/dd/span"
  );
  let portfolio_value = await page.evaluate(
    (el) => el.textContent,
    portfolio[0]
  );
  let investiert = await page.$x(
    "/html/body/div/div/div/div[3]/main/div[2]/div/div/div[2]/div/div/div/div/div[2]/dl/div[2]/div/dd/span"
  );
  let investiert_value = await page.evaluate(
    (el) => el.textContent,
    investiert[0]
  );
  let kursgewinne = await page.$x(
    "/html/body/div/div/div/div[3]/main/div[2]/div/div/div[2]/div/div/div/div/div[2]/dl/div[3]/div/dd/span"
  );
  let kursgewinne_value = await page.evaluate(
    (el) => el.textContent,
    kursgewinne[0]
  );
  let dividenden = await page.$x(
    "/html/body/div/div/div/div[3]/main/div[2]/div/div/div[2]/div/div/div/div/div[2]/dl/div[4]/div/dd/span"
  );
  let dividenden_value = await page.evaluate(
    (el) => el.textContent,
    dividenden[0]
  );
  console.log("got data");
  portfolio_value = cleanup(portfolio_value);
  investiert_value = cleanup(investiert_value);
  kursgewinne_value = cleanup(kursgewinne_value);
  dividenden_value = cleanup(dividenden_value);

  portfolioCounter.set(portfolio_value);
  investedCounter.set(investiert_value);
  portfolioWinCounter.set(kursgewinne_value);
  dividendCounter.set(dividenden_value);

  await browser.close();
  loginCounter.inc();
};
