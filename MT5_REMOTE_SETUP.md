
# MT5 Remote Connection Setup

This guide will help you connect your MetaTrader5 terminal on your home PC to this trading application running on Replit.

## Prerequisites

1. **MetaTrader5** installed and running on your home PC (Windows)
2. **Python 3.7+** installed on your home PC
3. **MetaTrader5 Python package** installed on your home PC

## Step 1: Install Python Dependencies on Your Home PC

Open Command Prompt or PowerShell on your Windows PC and run:

```bash
pip install MetaTrader5 websockets asyncio
```

## Step 2: Download and Run MT5 Bridge Server

1. Copy the `mt5_bridge_server.py` file to your home PC
2. Make sure MetaTrader5 is running and logged into your account
3. Open Command Prompt and navigate to the folder containing the script
4. Run the server:

```bash
python mt5_bridge_server.py --host 0.0.0.0 --port 8765
```

You should see output like:
```
2024-08-31 15:30:00,123 - INFO - Starting MT5 Bridge Server on 0.0.0.0:8765
2024-08-31 15:30:00,125 - INFO - MT5 connection initialized successfully  
2024-08-31 15:30:00,127 - INFO - MT5 Bridge Server running on ws://0.0.0.0:8765
2024-08-31 15:30:00,128 - INFO - Waiting for client connections...
```

## Step 3: Configure Network Access

### Option A: Port Forwarding (Recommended for permanent setup)
1. Find your home PC's local IP address (usually 192.168.x.x)
2. Access your router's admin panel
3. Set up port forwarding for port 8765 to your PC's IP
4. Note your external IP address

### Option B: Temporary Access (For testing)
1. Temporarily disable Windows Firewall
2. Use your local network IP address
3. **Only use this method for testing on your local network**

## Step 4: Configure Remote Connection in Replit

1. Go to the Brokers page in your trading application
2. Click "Configure Remote MT5"
3. Enter your connection details:
   - **Host**: Your external IP address (Option A) or local IP (Option B)
   - **Port**: 8765 (or the port you configured)
4. Click "Connect"

## Security Considerations

⚠️ **Important Security Notes:**

1. **Firewall**: Only open the specific port (8765) you're using
2. **Network**: Consider using a VPN for additional security
3. **Authentication**: The current setup doesn't include authentication - only use on trusted networks
4. **SSL**: For production use, consider adding SSL/TLS encryption

## Troubleshooting

### Connection Failed
- Check that MT5 Bridge Server is running on your home PC
- Verify port forwarding is configured correctly
- Ensure Windows Firewall allows connections on port 8765
- Confirm your external IP address is correct

### MT5 Initialization Failed
- Make sure MetaTrader5 is running and logged in
- Verify the MetaTrader5 Python package is installed: `pip install MetaTrader5`
- Check that your MT5 account has API access enabled

### Commands Not Working
- Verify your MT5 account has the necessary permissions
- Check that the symbol you're trying to trade is available
- Ensure your account has sufficient balance

## Alternative: VPS Setup

For a more robust solution, consider setting up a Windows VPS with MT5 and running the bridge server there. This provides:
- 24/7 availability
- Better security
- Consistent connection
- No need to keep your home PC running

## Support

If you encounter issues:
1. Check the server logs on your home PC
2. Verify MT5 terminal is connected and functioning
3. Test the connection using the status endpoint in the application
