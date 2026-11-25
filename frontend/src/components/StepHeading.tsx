interface StepHeadingProps {
  number: number;
  title: string;
  description: string;
}

// Gives each workflow step a consistent number, title, and short explanation.
export function StepHeading({
  number,
  title,
  description
}: StepHeadingProps) {
  return (
    <div className="section-heading">
      <span className="step-number">{number}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}
