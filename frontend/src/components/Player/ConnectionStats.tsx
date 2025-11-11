import React, {useState, useEffect} from 'react';

const ConnectionStats: React.FC<{}> = () => {
  const [connectionStatus, setConnectionStatus] = useState<
    | {
        latency: number;
        timestamp: number;
      }
    | undefined
  >();
  const [socketConnected, setSocketConnected] = useState<boolean>(false);

  useEffect(() => {
    const it = setInterval(() => {
      setConnectionStatus((window as any).connectionStatus);
      const socket = (window as any).socket;
      setSocketConnected(socket?.connected ?? false);
    }, 100);
    return () => {
      clearInterval(it);
    };
  }, []);

  if (connectionStatus) {
    return (
      <div>
        <div>
          Ping: {connectionStatus?.latency}
          ms ({Math.floor((Date.now() - connectionStatus?.timestamp) / 1000)}s ago)
        </div>
      </div>
    );
  }

  // If socket is connected but we haven't received a pong yet, show "Connecting..."
  if (socketConnected) {
    return <div>Connecting...</div>;
  }

  return <div>Not connected</div>;
};

export default ConnectionStats;
