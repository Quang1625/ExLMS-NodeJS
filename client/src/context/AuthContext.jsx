import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) setUser(JSON.parse(stored))
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('access_token',  data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    localStorage.setItem('user',          JSON.stringify(data.user))
    setUser(data.user)
    return data
  }

  const googleLogin = async (credential) => {
    try {
      const { data } = await api.post('/auth/google', { credential })
      localStorage.setItem('access_token',  data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      localStorage.setItem('user',          JSON.stringify(data.user))
      setUser(data.user)
      return data
    } catch (err) {
      console.error('Google Login Error:', JSON.stringify(err.response?.data || {}, null, 2));
      throw err;
    }
  }

  const logout = async () => {

    const refresh_token = localStorage.getItem('refresh_token')
    try { await api.post('/auth/logout', { refresh_token }) } catch {}
    localStorage.clear()
    setUser(null)
  }

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload)
    return data
  }

  const updateUserInfo = (newData) => {
    const updated = { ...user, ...newData }
    localStorage.setItem('user', JSON.stringify(updated))
    setUser(updated)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, googleLogin, logout, register, updateUserInfo }}>
      {children}
    </AuthContext.Provider>
  )
}


export const useAuth = () => useContext(AuthContext)
