describe("App receitas", () => {
  beforeAll(async () => {
    await page.goto(process.env.ENDPOINT_URL || "https://www.google.com");
  });

  it(`should display "google" text on page`, async () => {
    await expect(page).toMatch("google");
  });
});
