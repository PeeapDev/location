"""
Luhn algorithm implementation for PDA-ID check digit calculation.

The Luhn algorithm (mod 10) is used to validate identification numbers
and detect accidental errors in data entry.
"""


def calculate_luhn_check_digit(number_str: str) -> int:
    """
    Calculate the Luhn check digit for a numeric string.

    Args:
        number_str: String of digits to calculate check digit for

    Returns:
        Single digit (0-9) that makes the full number valid

    Example:
        >>> calculate_luhn_check_digit("231004700014")
        2
    """
    # Convert string to list of integers
    digits = [int(d) for d in number_str if d.isdigit()]

    # Double every second digit from the right
    for i in range(len(digits) - 1, -1, -2):
        digits[i] *= 2
        if digits[i] > 9:
            digits[i] -= 9

    # Sum all digits
    total = sum(digits)

    # Check digit is what's needed to make total divisible by 10
    return (10 - (total % 10)) % 10


def validate_luhn(number_str: str) -> bool:
    """
    Validate a number string using the Luhn algorithm.

    Args:
        number_str: Full number string including check digit

    Returns:
        True if valid, False otherwise

    Example:
        >>> validate_luhn("2310047000142")  # With check digit 2
        True
    """
    digits = [int(d) for d in number_str if d.isdigit()]

    if len(digits) < 2:
        return False

    # Double every second digit from the right, starting from second-to-last
    for i in range(len(digits) - 2, -1, -2):
        digits[i] *= 2
        if digits[i] > 9:
            digits[i] -= 9

    return sum(digits) % 10 == 0


def extract_numeric_from_pda_id(pda_id: str) -> str:
    """
    Extract the numeric portion from a PDA-ID for Luhn calculation.

    PDA-ID format: SL-XXXX-YYY-NNNNNN-C
    Numeric portion: XXXXYYYNNNNNN (without check digit)

    Args:
        pda_id: Full PDA-ID string

    Returns:
        Numeric string for Luhn calculation
    """
    # Remove prefix and extract numbers
    # SL-2310-047-000142-7 -> 2310047000142
    parts = pda_id.split("-")
    if len(parts) != 5:
        raise ValueError(f"Invalid PDA-ID format: {pda_id}")

    return parts[1] + parts[2] + parts[3]


def validate_pda_id_check_digit(pda_id: str) -> bool:
    """
    Validate the check digit of a PDA-ID.

    Args:
        pda_id: Full PDA-ID with check digit (e.g., "SL-2310-047-000142-7")

    Returns:
        True if check digit is valid
    """
    try:
        parts = pda_id.split("-")
        if len(parts) != 5 or parts[0] != "SL":
            return False

        numeric_part = extract_numeric_from_pda_id(pda_id)
        check_digit = int(parts[4])

        expected = calculate_luhn_check_digit(numeric_part)
        return check_digit == expected
    except (ValueError, IndexError):
        return False
