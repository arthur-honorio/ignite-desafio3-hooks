import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react"
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
interface NewCartWhenRemovingProduct {
  removed: Product[]
  mantained: Product[]
}

interface CartContextData {
  cart: Product[]
  addProduct: (productId: number) => Promise<void>
  removeProduct: (productId: number) => void
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void
}

const CartContext = createContext<CartContextData>({} as CartContextData)

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [stock, setStock] = useState<Stock[]>([])
  const [cart, setCart] = useState<Product[]>(() => {
    // localStorage.setItem("@RocketShoes:cart", "[]")
    const storagedCart = localStorage.getItem("@RocketShoes:cart")

    if (storagedCart) {
      return JSON.parse(storagedCart)
    }

    return []
  })
  console.log(cart, stock)

  useEffect(() => {
    api.get("/stock").then(response => {
      console.log(response)
      setStock(response.data)
    })
  }, [])

  const addProduct = async (productId: number) => {
    try {
      let product = await api.get(`products/${productId}`).then(response => ({
        ...response.data,
        amount: 0,
      }))

      let productInStock = stock.filter(
        stockProduct => stockProduct.id === productId
      )[0]

      let productsInCart = cart.map(productInCart => productInCart.id)

      if (!productsInCart.includes(productId)) {

        let newCart = [...cart, { ...product, amount: 1 }]
        setCart(newCart)
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart))

      } else {
        let newCart = cart.map(cartProduct => {

          if (cartProduct.id === productId) {

            if (productInStock.amount === cartProduct.amount ) {
              throw new Error("Quantidade solicitada fora de estoque")
            }
            return {
              ...cartProduct,
              amount: cartProduct.amount + 1,
            }

          } else {
            return cartProduct
          }
        })

        setCart(newCart)
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart))
      }
      setStock(() =>
        stock.map(product => {
          if (product.id === productId)
            return { ...product, amount: productInStock.amount }
          return product
        })
      )
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Erro na adição do produto")
    }
  }

  const removeProduct = (productId: number) => {
    try {
      let newCart = cart.reduce((accumulatedProducts, product) => {
        if (product.id !== productId)
          accumulatedProducts.mantained.push(product)
        else accumulatedProducts.removed.push(product)
        return accumulatedProducts
      }, {
        removed: [],
        mantained: [],
      } as NewCartWhenRemovingProduct)
      setCart([...newCart.mantained])
      localStorage.setItem(
        "@RocketShoes:cart",
        JSON.stringify(newCart.mantained)
      )
    } catch(error: any) {
      console.error(error)
      toast.error("Erro na remoção do produto")
    }
  }

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      let amountOfProductInStock = stock.filter(
        stockProduct => stockProduct.id === productId
      )[0].amount
      let newCart = cart.map(cartProduct => {
        if (cartProduct.id === productId) {
          if (amount > amountOfProductInStock)
            throw new Error("Quantidade solicitada fora de estoque")
          return { ...cartProduct, amount }
        }
        return cartProduct
      })
      setCart(newCart)
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart))
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Erro na alteração de quantidade do produto")
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
