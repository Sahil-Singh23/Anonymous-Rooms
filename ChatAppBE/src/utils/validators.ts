/**
 * Validates username format
 * - 1-50 characters
 * - Alphanumeric, underscore, dash, space only
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || typeof username !== "string") {
    return { valid: false, error: "Username must be a string" };
  }

  const trimmed = username.trim();
  
  if (trimmed.length < 1) {
    return { valid: false, error: "Username cannot be empty" };
  }

  if (trimmed.length > 50) {
    return { valid: false, error: "Username must be at most 50 characters" };
  }

  // Allow alphanumeric, underscore, dash, space
  if (!/^[a-zA-Z0-9_\- ]+$/.test(trimmed)) {
    return { valid: false, error: "Username can only contain letters, numbers, underscore, dash, and space" };
  }

  return { valid: true };
}

/**
 * Validates room code format
 * - Exactly 6 alphanumeric characters
 */
export function validateRoomCode(roomCode: string): { valid: boolean; error?: string } {
  if (!roomCode || typeof roomCode !== "string") {
    return { valid: false, error: "Room code must be a string" };
  }

  const trimmed = roomCode.trim();

  if (trimmed.length !== 6) {
    return { valid: false, error: "Room code must be exactly 6 characters" };
  }

  if (!/^[a-zA-Z0-9]{6}$/.test(trimmed)) {
    return { valid: false, error: "Room code must contain only letters and numbers" };
  }

  return { valid: true };
}
