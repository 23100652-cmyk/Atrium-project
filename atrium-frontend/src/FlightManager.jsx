function FlightManager({ role, canEdit }) {
  return (
    <div>
      {/* Only Admin sees the "Delete" and "Add New Flight" buttons */}
      {role === 'admin' && <button>Add New Flightsss</button>}
      
      <table>
        {/* Render flight list */}
        {flights.map(flight => (
          <tr key={flight.id}>
            <td>{flight.name}</td>
            <td>
              {/* Both Admin and Operator see the Edit button */}
              {canEdit && <button>Edit Availability</button>}
              
              {/* Only Admin sees the Delete button */}
              {role === 'admin' && <button>Delete</button>}
            </td>
          </tr>
        ))}
      </table>
    </div>
  );
}