
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Product } from '../types';

export interface CartItem {
    product: Product;
    quantity: number;
    description?: string;
    tempId: string;
    sizeList?: any[];
    layoutOption?: 'sim' | 'precisa' | null;
    moldOption?: 'sim' | 'precisa' | null;
    artLink?: string;
    artExtrasDesc?: string;
    wantsDigitalGrid?: boolean;
}

interface CartContextType {
    cart: CartItem[];
    addToCart: (
        product: Product, 
        quantity?: number, 
        description?: string,
        extraData?: Partial<Omit<CartItem, 'product' | 'quantity' | 'description' | 'tempId'>>
    ) => void;
    removeFromCart: (tempId: string) => void;
    clearCart: () => void;
    cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [cart, setCart] = useState<CartItem[]>([]);

    const addToCart = (
        product: Product, 
        quantity: number = 1, 
        description: string = '',
        extraData: any = {}
    ) => {
        setCart(prev => [...prev, {
            product,
            quantity,
            description,
            tempId: crypto.randomUUID(),
            ...extraData
        }]);
    };

    const removeFromCart = (tempId: string) => {
        setCart(prev => prev.filter(item => item.tempId !== tempId));
    };

    const clearCart = () => {
        setCart([]);
    };

    const cartCount = cart.length;

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, cartCount }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within a CartProvider');
    return context;
};
