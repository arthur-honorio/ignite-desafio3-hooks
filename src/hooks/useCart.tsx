import { createContext, ReactNode, useContext, useState } from "react"
import { toast } from "react-toastify"
import { api } from "../services/api"
import { Product, Stock } from "../types"

interface CartProviderProps {
  children: ReactNode
}

interface UpdateProductAmount {
  productId: number
  amount: number
}
interface CartContextData {
  cart: Product[]
  addProduct: (productId: number) => Promise<void>
  removeProduct: (productId: number) => void
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void
}

const CartContext = createContext<CartContextData>({} as CartContextData)

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    // localStorage.setItem("@RocketShoes:cart", "[]")
    const storagedCart = localStorage.getItem("@RocketShoes:cart")

    if (storagedCart) {
      return JSON.parse(storagedCart)
    }

    return []
  })

  const addProduct = async (productId: number) => {
    try {
      let stockAmount = await api
        .get(`/stock/${productId}`)
        .then(response => response.data.amount)

      let newCart = [...cart]

      let productInCart = newCart.find(
        productInCart => productId === productInCart.id
      )
      let cartAmount = productInCart?.amount ?? 0

      if (stockAmount < cartAmount + 1) {
        toast.error("Quantidade solicitada fora de estoque")
        return

      } else {
        if (productInCart) {
          productInCart.amount += 1
        } else {
          let product = await api
            .get(`products/${productId}`)
            .then(response => ({...response.data, amount: 1}))
          newCart.push(product)
        }

        setCart(newCart)
        localStorage.setItem("@RocketShoes:cart",JSON.stringify(newCart)
        )
      }
    } catch {
      toast.error("Erro na adição do produto")
    }
  }

  const removeProduct = (productId: number) => {
    try {
      let newCart = [...cart].filter(product => productId !== product.id)
      if (newCart.length === cart.length) throw Error()
      setCart(newCart)
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart))
    } catch {
      toast.error("Erro na remoção do produto")
    }
  }

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const stockAmount: number = await api
        .get(`stock/${productId}`)
        .then(response => response.data.amount)

      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque")
        return
      } else if (amount < 1) {
        throw Error()
      } else {
        let newCart = [...cart].map(cartProduct => {
          if (cartProduct.id === productId) {
            return { ...cartProduct, amount }
          }
          return cartProduct
        })
        setCart(newCart)
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart))
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto")
    }
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextData {
  const context = useContext(CartContext)

  return context
}
