class InsufficientCreditsError(Exception):
    """Raised when a user doesn't have enough credits for an operation."""

    def __init__(self, required: int, available: int):
        self.required = required
        self.available = available
        super().__init__(f"Insufficient credits: need {required}, have {available}")
