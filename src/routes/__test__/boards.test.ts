import request from "supertest";
import app from "../../index";

describe("Boards API", () => {
  it("GET /boards/:id/activity/preview should return 404 for non-existent board", async () => {
    const res = await request(app).get("/boards/9999/activity/preview");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  // Puedes agregar más pruebas aquí para otros endpoints y casos
});
