def test_health(client):
    response = client.get("/api/status/health")
    assert response.status_code == 200
    assert response.json().get("data").get("status") == "ok"
