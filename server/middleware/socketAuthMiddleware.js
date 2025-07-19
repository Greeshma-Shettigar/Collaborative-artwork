// server/middleware/socketAuthMiddleware.js

import jwt from 'jsonwebtoken';

const socketAuthMiddleware = (socket, next) => {
    // --- DEBUGGING JWT_SECRET (KEEP THIS) ---
    console.log("--- DEBUGGING JWT_SECRET IN DEDICATED SOCKET AUTH MIDDLEWARE ---");
    console.log("process.env.JWT_SECRET value:", process.env.JWT_SECRET);
    if (!process.env.JWT_SECRET) {
        console.error("CRITICAL ERROR: JWT_SECRET IS UNDEFINED OR EMPTY! Check server/.env and server startup.");
        // Immediately terminate connection with a clear error
        return next(new Error('Server misconfiguration: JWT secret not loaded.'));
    }
    console.log("--- END DEBUGGING ---");

    // For Socket.IO, the token is typically passed in socket.handshake.auth.token
    const token = socket.handshake.auth.token;

    if (!token) {
        console.log("Socket Auth Error: No token provided in handshake.");
        return next(new Error('Authentication failed: No token provided for socket.'));
    }

    try {
        // Log part of the token for verification
        console.log("Socket received token (first few chars):", token.substring(0, 20) + "...");

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded; // Attach decoded user info to the socket object
        console.log("Socket authenticated successfully for user:", decoded.userId);
        next(); // Proceed with the connection
    } catch (error) {
        console.error("Socket JWT Verification Error:", error);
        // Provide more specific error messages to the client
        if (error.name === 'TokenExpiredError') {
            return next(new Error('Authentication failed: Token expired.'));
        }
        // This handles 'JsonWebTokenError' including 'jwt malformed', 'invalid signature' etc.
        return next(new Error('Authentication failed: Invalid or expired token.'));
    }
};

export default socketAuthMiddleware;