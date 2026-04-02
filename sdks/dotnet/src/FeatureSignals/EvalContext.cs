using System.Collections.ObjectModel;

namespace FeatureSignals;

/// <summary>
/// Immutable evaluation context identifying the entity being evaluated.
/// </summary>
public sealed class EvalContext
{
    private readonly Dictionary<string, object?> _attributes;

    public EvalContext(string key, IDictionary<string, object?>? attributes = null)
    {
        Key = key ?? throw new ArgumentNullException(nameof(key));
        _attributes = attributes is not null
            ? new Dictionary<string, object?>(attributes)
            : new Dictionary<string, object?>();
        Attributes = new ReadOnlyDictionary<string, object?>(_attributes);
    }

    /// <summary>Unique key for this evaluation target (e.g. user-id).</summary>
    public string Key { get; }

    /// <summary>Arbitrary attributes attached to the context.</summary>
    public IReadOnlyDictionary<string, object?> Attributes { get; }

    /// <summary>
    /// Returns a new <see cref="EvalContext"/> with the additional attribute.
    /// </summary>
    public EvalContext WithAttribute(string name, object? value)
    {
        var attrs = new Dictionary<string, object?>(_attributes) { [name] = value };
        return new EvalContext(Key, attrs);
    }
}
