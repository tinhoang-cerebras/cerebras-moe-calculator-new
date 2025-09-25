def greet_user(name):
    """
    Simple function to greet a user by name.
    
    Args:
        name (str): The user's name
    
    Returns:
        str: A greeting message
    """
    return f"Hello world to you, {name}!"


def main():
    """Example usage"""
    # Get user input
    user_name = input("Enter your name: ")
    
    # Generate greeting
    greeting = greet_user(user_name)
    
    # Print result
    print(greeting)


if __name__ == "__main__":
    main()
