import { nanoid } from "nanoid";
import { useEffect, useState } from "react";

const generateUserName = () => {
    const word = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
    return `anonymous-${word}-${nanoid(5)}`
}

const ANIMALS = ["wolf", 'hawk', 'bear', 'shark']

const STORAGE_KEY = "chat_username"

export const useUsername = () => {

    const [username, setUserName] = useState('');

    useEffect(() => {
        const main = () => {
            const stored = localStorage.getItem(STORAGE_KEY)

            if (stored) {
                setUserName(stored)
                return;
            }

            const generated = generateUserName()
            localStorage.setItem(STORAGE_KEY, generated) // setting new generated username to local storage
            setUserName(generated)
        }

        main()
    }, [])

    return {username}

}