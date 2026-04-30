const clients = new Set();

exports.addClient = (res) => clients.add(res);
exports.removeClient = (res) => clients.delete(res);

exports.broadcast = (event, data) => {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch (_) { clients.delete(res); }
  }
};
