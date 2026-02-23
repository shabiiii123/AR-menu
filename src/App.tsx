import { useState } from "react"
import "./App.css"
import ARView from "./components/ARView"

function App() {
  const [showAR, setShowAR] = useState(false)

  if (showAR) {
    return <ARView />
  }

  return (
    <div style={{ textAlign: "center", paddingTop: "100px" }}>
      <h1>Restaurant AR Menu</h1>

      <button
        onClick={() => setShowAR(true)}
        style={{
          padding: "15px 30px",
          fontSize: "18px",
          cursor: "pointer",
        }}
      >
        View Food in AR
      </button>
    </div>
  )
}

export default App