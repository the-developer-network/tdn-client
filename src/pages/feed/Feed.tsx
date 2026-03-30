import { useEffect, useState } from "react"
import { getProfile } from "./api";

export default function Feed() {
  const [username, setUsername] = useState();

  useEffect(() => {
      getProfile().then((d) => {
          setUsername(d.username);
      })
  }, [])

  return (
    <div className="text-white">
      Username: { username }
    </div>
  )
}