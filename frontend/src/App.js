import React, { useState } from "react";
import axios from "axios";

function App() {
  const [item, setItem] = useState({ name: "", price: "", description: "" });
  const [response, setResponse] = useState(null);

  const handleChange = (e) => {
    setItem({ ...item, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      const res = await axios.post("http://127.0.0.1:8000/items/", item);
      setResponse(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "5rem" }}>
      <h2>React + FastAPI Demo</h2>
      <input
        name="name"
        placeholder="Item name"
        onChange={handleChange}
      /><br/>
      <input
        name="price"
        type="number"
        placeholder="Item price"
        onChange={handleChange}
      /><br/>
      <input
        name="description"
        placeholder="Item description"
        onChange={handleChange}
      /><br/>
      <button onClick={handleSubmit}>Send to API</button>

      {response && (
        <div style={{ marginTop: "2rem" }}>
          <h3>API Response:</h3>
          <pre>{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default App;