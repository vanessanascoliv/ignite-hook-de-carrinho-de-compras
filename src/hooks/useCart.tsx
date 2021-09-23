import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';

import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });
  //Comparando o valor anterior do carrinho com o valor atual e se esse valor for diferente é aplicado o setItem no localStorage
  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  })

  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if(cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  },[cart,cartPreviousValue])

  const addProduct = async (productId: number) => {
    try {
      //cria um novo array com os carts ja existentes(imutabilidade)
      const updatedCart = [...cart];
      //verifica se o produto já existe através do id
      const productExists = updatedCart.find( product => product.id === productId);

      //verificando stock, buscando pelo id
      const stock = await api.get(`/stock/${productId}`);
      // pegando a qtd em stock
      const stockAmount = stock.data.amount;
      //quantidade do produto no Carrinho, se o produto existe eu pego o amount se não a qtd é = 0
      const currentAmount = productExists ? productExists.amount : 0;

      //qtd desejada
      const amount = currentAmount + 1;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(productExists){
        productExists.amount = amount;
      }else {
        //se for um produto novo 
        const product = await api.get(`/products/${productId}`);
        //pegando todos os dados da api e criando um campo amount que dev iniciar c 1 já q é a primeira vez q esta sendo adcionado ao carrinho
        const newProduct = {
          ...product.data,
          amount: 1
        }
        updatedCart.push(newProduct);
      }

      setCart(updatedCart);
      
   } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
     const updatedCart = [...cart];
     const productIndex = updatedCart.findIndex(product => product.id === productId );

     if(productIndex >= 0) {
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
       
     }else {
        throw Error();
     }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0){
        return;
      }

      const stock = await api.get(`/stock/${productId}`);
      
      const strockAmount = stock.data.amount;

      if(amount > strockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId);

      if(productExists) {
        productExists.amount = amount;
        setCart(updatedCart);
       
      } else {
        throw Error();
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
