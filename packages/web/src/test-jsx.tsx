import { useState } from 'react';

export function Test(): JSX.Element {
  const [items] = useState<string[]>(['a', 'b']);

  return (
    <>
      <table>
        <tbody>
          {items.map(function (item) {
            return (
              <tr key={item}>
                <td>{item}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
